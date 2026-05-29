import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

/**
 * GET /api/settings/entities
 * Get entities for a user, sorted by sortOrder
 * Query params: userId (required)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const entities = await db.entity.findMany({
      where: { userId },
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'asc' },
      ],
      include: {
        eventEntities: true,
      },
    });

    return NextResponse.json({ entities });
  } catch (error) {
    console.error('Error fetching entities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch entities' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings/entities
 * Create a new entity
 * Body: { name, userId, sortOrder? }
 */
export async function POST(request: NextRequest) {
  let entityName = '';
  try {
    const body = await request.json();
    const { name, userId, sortOrder } = body;
    entityName = name || '';

    if (!name) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Verify user exists
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const entity = await db.entity.create({
      data: {
        name,
        userId,
        sortOrder: sortOrder ?? 0,
      },
      include: {
        eventEntities: true,
      },
    });

    return NextResponse.json({ entity }, { status: 201 });
  } catch (error) {
    console.error('Error creating entity:', error);
    // Check for Prisma unique constraint violation (userId_name)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = (error.meta as { target?: string[] })?.target;
      if (target?.includes('name')) {
        return NextResponse.json(
          { error: `Entity "${entityName}" already exists, please use a different name` },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: 'This entity already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create entity' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings/entities
 * Update an entity by id
 * Body: { id, name? }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    // Check if entity exists
    const existing = await db.entity.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Entity not found' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;

    const entity = await db.entity.update({
      where: { id },
      data: updateData,
      include: {
        eventEntities: true,
      },
    });

    return NextResponse.json({ entity });
  } catch (error) {
    console.error('Error updating entity:', error);
    // Check for Prisma unique constraint violation (userId_name)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Entity name already exists for this user' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update entity' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/settings/entities
 * Delete an entity by id
 * Query params: id (required), userId (for authorization)
 * Also deletes all EventEntity records linking to this entity
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!id) {
      return NextResponse.json(
        { error: 'id query parameter is required' },
        { status: 400 }
      );
    }

    // Check if entity exists
    const existing = await db.entity.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        { error: 'Entity not found' },
        { status: 404 }
      );
    }

    // Authorization check: only the owner can delete
    if (userId && existing.userId !== userId) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this entity' },
        { status: 403 }
      );
    }

    // Delete all EventEntity records linking to this entity first
    await db.eventEntity.deleteMany({
      where: { entityId: id },
    });

    // Delete the entity itself
    await db.entity.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting entity:', error);
    return NextResponse.json(
      { error: 'Failed to delete entity' },
      { status: 500 }
    );
  }
}
