import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/users
 * List all users
 */
export async function GET() {
  try {
    const users = await db.user.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        _count: {
          select: { events: true, eventTypes: true, shareLinks: true },
        },
      },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/users
 * Create a new user
 * Body: { name, avatar? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, avatar } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const user = await db.user.create({
      data: {
        name,
        avatar: avatar || '',
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
