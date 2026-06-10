import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/data/export
 * Export ALL data from the database as a JSON backup file.
 * This is used for migrating data from Supabase (PostgreSQL) to local SQLite (Electron).
 *
 * Query params:
 *   - accountId: (optional) If provided, only export data belonging to this account and its users
 *
 * The exported JSON includes all tables with their relationships preserved.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    // Build filter if accountId is specified
    const accountFilter = accountId ? { where: { id: accountId } } : {};

    // Fetch all accounts with their users
    const accounts = await db.account.findMany({
      ...accountFilter,
      include: {
        users: {
          include: {
            events: {
              include: {
                eventType: true,
                eventEntities: {
                  include: {
                    entity: true,
                  },
                },
              },
            },
            eventTypes: true,
            colorSettings: true,
            entities: {
              include: {
                eventEntities: true,
              },
            },
            shareLinks: true,
            ownedCalendars: true,
            memberships: true,
          },
        },
      },
    });

    // Get user IDs for filtering global tables
    const userIds = accounts.flatMap((a) => a.users.map((u) => u.id));

    // Fetch holidays (global, not user-specific)
    const holidays = await db.holiday.findMany();

    // Fetch CalendarMemberships that involve the exported users
    const calendarMemberships = accountId
      ? await db.calendarMembership.findMany({
          where: {
            OR: [
              { calendarUserId: { in: userIds } },
              { memberUserId: { in: userIds } },
            ],
          },
        })
      : await db.calendarMembership.findMany();

    // Build the export data - flatten for easy import
    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      accounts: accounts.map((account) => ({
        id: account.id,
        username: account.username,
        password: account.password,
        role: account.role,
        createdAt: account.createdAt.toISOString(),
        updatedAt: account.updatedAt.toISOString(),
      })),
      users: accounts.flatMap((account) =>
        account.users.map((user) => ({
          id: user.id,
          name: user.name,
          avatar: user.avatar,
          accountId: user.accountId,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        }))
      ),
      eventTypes: accounts.flatMap((account) =>
        account.users.flatMap((user) =>
          user.eventTypes.map((et) => ({
            id: et.id,
            name: et.name,
            shape: et.shape,
            color: et.color,
            symbol: et.symbol,
            sortOrder: et.sortOrder,
            userId: et.userId,
            createdAt: et.createdAt.toISOString(),
            updatedAt: et.updatedAt.toISOString(),
          }))
        )
      ),
      entities: accounts.flatMap((account) =>
        account.users.flatMap((user) =>
          user.entities.map((entity) => ({
            id: entity.id,
            name: entity.name,
            sortOrder: entity.sortOrder,
            userId: entity.userId,
            createdAt: entity.createdAt.toISOString(),
            updatedAt: entity.updatedAt.toISOString(),
          }))
        )
      ),
      events: accounts.flatMap((account) =>
        account.users.flatMap((user) =>
          user.events.map((event) => ({
            id: event.id,
            title: event.title,
            description: event.description,
            startDate: event.startDate.toISOString(),
            endDate: event.endDate?.toISOString() || null,
            allDay: event.allDay,
            eventTypeId: event.eventTypeId,
            userId: event.userId,
            createdById: event.createdById,
            createdAt: event.createdAt.toISOString(),
            updatedAt: event.updatedAt.toISOString(),
            // Include entity relations
            eventEntities: event.eventEntities.map((ee) => ({
              id: ee.id,
              eventId: ee.eventId,
              entityId: ee.entityId,
              createdAt: ee.createdAt.toISOString(),
            })),
          }))
        )
      ),
      dayColorSettings: accounts.flatMap((account) =>
        account.users.flatMap((user) =>
          user.colorSettings.map((cs) => ({
            id: cs.id,
            dayType: cs.dayType,
            color: cs.color,
            label: cs.label,
            sortOrder: cs.sortOrder,
            userId: cs.userId,
            createdAt: cs.createdAt.toISOString(),
            updatedAt: cs.updatedAt.toISOString(),
          }))
        )
      ),
      shareLinks: accounts.flatMap((account) =>
        account.users.flatMap((user) =>
          user.shareLinks.map((sl) => ({
            id: sl.id,
            token: sl.token,
            userId: sl.userId,
            name: sl.name,
            expiresAt: sl.expiresAt?.toISOString() || null,
            createdAt: sl.createdAt.toISOString(),
          }))
        )
      ),
      calendarMemberships: calendarMemberships.map((cm) => ({
        id: cm.id,
        calendarUserId: cm.calendarUserId,
        memberUserId: cm.memberUserId,
        role: cm.role,
        createdAt: cm.createdAt.toISOString(),
      })),
      holidays: holidays.map((h) => ({
        id: h.id,
        date: h.date,
        name: h.name,
        type: h.type,
        year: h.year,
        createdAt: h.createdAt.toISOString(),
        updatedAt: h.updatedAt.toISOString(),
      })),
    };

    // Return as downloadable JSON
    const jsonStr = JSON.stringify(exportData, null, 2);
    const filename = `calendar-backup-${new Date().toISOString().slice(0, 10)}.json`;

    return new NextResponse(jsonStr, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error exporting data:', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}
