import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/share?userId=xxx
 * List share links for a user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId query parameter is required' },
        { status: 400 }
      );
    }

    const shareLinks = await db.shareLink.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ shareLinks });
  } catch (error) {
    console.error('Error fetching share links:', error);
    return NextResponse.json(
      { error: 'Failed to fetch share links' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/share
 * Create a new share link
 * Body: { userId, name?, expiresAt? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, name, expiresAt } = body;

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

    const shareLink = await db.shareLink.create({
      data: {
        userId,
        name: name || '分享链接',
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    return NextResponse.json({ shareLink }, { status: 201 });
  } catch (error) {
    console.error('Error creating share link:', error);
    return NextResponse.json(
      { error: 'Failed to create share link' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/share?id=xxx
 * Delete a share link
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'id query parameter is required' },
        { status: 400 }
      );
    }

    // Check if share link exists
    const existing = await db.shareLink.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Share link not found' },
        { status: 404 }
      );
    }

    await db.shareLink.delete({ where: { id } });

    return NextResponse.json({ message: 'Share link deleted successfully' });
  } catch (error) {
    console.error('Error deleting share link:', error);
    return NextResponse.json(
      { error: 'Failed to delete share link' },
      { status: 500 }
    );
  }
}
