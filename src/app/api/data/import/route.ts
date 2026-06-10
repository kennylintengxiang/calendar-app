import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/data/import
 * Import ALL data from a JSON backup file into the current database.
 * This is used for migrating data from Supabase (PostgreSQL) to local SQLite (Electron).
 *
 * Body: {
 *   data: { ... },       // The exported JSON object
 *   mode: 'merge' | 'replace'  // merge = add missing records, replace = clear and re-import
 * }
 *
 * The import preserves original IDs to maintain referential integrity.
 * In 'merge' mode, existing records with the same ID are skipped.
 * In 'replace' mode, all existing data is deleted first.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data, mode = 'merge' } = body;

    if (!data || !data.version) {
      return NextResponse.json(
        { error: 'Invalid backup file format' },
        { status: 400 }
      );
    }

    const result = {
      accounts: { imported: 0, skipped: 0 },
      users: { imported: 0, skipped: 0 },
      eventTypes: { imported: 0, skipped: 0 },
      entities: { imported: 0, skipped: 0 },
      events: { imported: 0, skipped: 0 },
      eventEntities: { imported: 0, skipped: 0 },
      dayColorSettings: { imported: 0, skipped: 0 },
      shareLinks: { imported: 0, skipped: 0 },
      calendarMemberships: { imported: 0, skipped: 0 },
      holidays: { imported: 0, skipped: 0 },
    };

    if (mode === 'replace') {
      // Delete all existing data in reverse dependency order
      await db.eventEntity.deleteMany();
      await db.calendarEvent.deleteMany();
      await db.eventType.deleteMany();
      await db.dayColorSetting.deleteMany();
      await db.entity.deleteMany();
      await db.shareLink.deleteMany();
      await db.calendarMembership.deleteMany();
      await db.user.deleteMany();
      await db.account.deleteMany();
      await db.holiday.deleteMany();
    }

    // 1. Import Accounts
    if (data.accounts) {
      for (const account of data.accounts) {
        try {
          if (mode === 'merge') {
            const existing = await db.account.findUnique({ where: { id: account.id } });
            if (existing) {
              result.accounts.skipped++;
              continue;
            }
            const existingByUsername = await db.account.findUnique({ where: { username: account.username } });
            if (existingByUsername) {
              result.accounts.skipped++;
              continue;
            }
          }
          await db.account.create({
            data: {
              id: account.id,
              username: account.username,
              password: account.password,
              role: account.role,
              createdAt: new Date(account.createdAt),
              updatedAt: new Date(account.updatedAt),
            },
          });
          result.accounts.imported++;
        } catch (e) {
          console.error('Error importing account:', account.id, e);
          result.accounts.skipped++;
        }
      }
    }

    // 2. Import Users
    if (data.users) {
      for (const user of data.users) {
        try {
          if (mode === 'merge') {
            const existing = await db.user.findUnique({ where: { id: user.id } });
            if (existing) {
              result.users.skipped++;
              continue;
            }
          }
          await db.user.create({
            data: {
              id: user.id,
              name: user.name,
              avatar: user.avatar || '',
              accountId: user.accountId || null,
              createdAt: new Date(user.createdAt),
              updatedAt: new Date(user.updatedAt),
            },
          });
          result.users.imported++;
        } catch (e) {
          console.error('Error importing user:', user.id, e);
          result.users.skipped++;
        }
      }
    }

    // 3. Import EventTypes
    if (data.eventTypes) {
      for (const et of data.eventTypes) {
        try {
          if (mode === 'merge') {
            const existing = await db.eventType.findUnique({ where: { id: et.id } });
            if (existing) {
              result.eventTypes.skipped++;
              continue;
            }
          }
          await db.eventType.create({
            data: {
              id: et.id,
              name: et.name,
              shape: et.shape,
              color: et.color,
              symbol: et.symbol || '',
              sortOrder: et.sortOrder,
              userId: et.userId,
              createdAt: new Date(et.createdAt),
              updatedAt: new Date(et.updatedAt),
            },
          });
          result.eventTypes.imported++;
        } catch (e) {
          console.error('Error importing event type:', et.id, e);
          result.eventTypes.skipped++;
        }
      }
    }

    // 4. Import Entities
    if (data.entities) {
      for (const entity of data.entities) {
        try {
          if (mode === 'merge') {
            const existing = await db.entity.findUnique({ where: { id: entity.id } });
            if (existing) {
              result.entities.skipped++;
              continue;
            }
          }
          await db.entity.create({
            data: {
              id: entity.id,
              name: entity.name,
              sortOrder: entity.sortOrder,
              userId: entity.userId,
              createdAt: new Date(entity.createdAt),
              updatedAt: new Date(entity.updatedAt),
            },
          });
          result.entities.imported++;
        } catch (e) {
          console.error('Error importing entity:', entity.id, e);
          result.entities.skipped++;
        }
      }
    }

    // 5. Import Events (without eventEntities - handled separately)
    if (data.events) {
      for (const event of data.events) {
        try {
          if (mode === 'merge') {
            const existing = await db.calendarEvent.findUnique({ where: { id: event.id } });
            if (existing) {
              result.events.skipped++;
              continue;
            }
          }
          await db.calendarEvent.create({
            data: {
              id: event.id,
              title: event.title,
              description: event.description || null,
              startDate: new Date(event.startDate),
              endDate: event.endDate ? new Date(event.endDate) : null,
              allDay: event.allDay,
              eventTypeId: event.eventTypeId || null,
              userId: event.userId,
              createdById: event.createdById || null,
              createdAt: new Date(event.createdAt),
              updatedAt: new Date(event.updatedAt),
            },
          });
          result.events.imported++;

          // 5b. Import EventEntities for this event
          if (event.eventEntities) {
            for (const ee of event.eventEntities) {
              try {
                if (mode === 'merge') {
                  const existing = await db.eventEntity.findUnique({ where: { id: ee.id } });
                  if (existing) {
                    result.eventEntities.skipped++;
                    continue;
                  }
                }
                await db.eventEntity.create({
                  data: {
                    id: ee.id,
                    eventId: ee.eventId,
                    entityId: ee.entityId,
                    createdAt: new Date(ee.createdAt),
                  },
                });
                result.eventEntities.imported++;
              } catch (e) {
                console.error('Error importing event entity:', ee.id, e);
                result.eventEntities.skipped++;
              }
            }
          }
        } catch (e) {
          console.error('Error importing event:', event.id, e);
          result.events.skipped++;
        }
      }
    }

    // 6. Import DayColorSettings
    if (data.dayColorSettings) {
      for (const cs of data.dayColorSettings) {
        try {
          if (mode === 'merge') {
            const existing = await db.dayColorSetting.findUnique({ where: { id: cs.id } });
            if (existing) {
              result.dayColorSettings.skipped++;
              continue;
            }
          }
          await db.dayColorSetting.create({
            data: {
              id: cs.id,
              dayType: cs.dayType,
              color: cs.color,
              label: cs.label,
              sortOrder: cs.sortOrder,
              userId: cs.userId,
              createdAt: new Date(cs.createdAt),
              updatedAt: new Date(cs.updatedAt),
            },
          });
          result.dayColorSettings.imported++;
        } catch (e) {
          console.error('Error importing color setting:', cs.id, e);
          result.dayColorSettings.skipped++;
        }
      }
    }

    // 7. Import ShareLinks
    if (data.shareLinks) {
      for (const sl of data.shareLinks) {
        try {
          if (mode === 'merge') {
            const existing = await db.shareLink.findUnique({ where: { id: sl.id } });
            if (existing) {
              result.shareLinks.skipped++;
              continue;
            }
          }
          await db.shareLink.create({
            data: {
              id: sl.id,
              token: sl.token,
              userId: sl.userId,
              name: sl.name,
              expiresAt: sl.expiresAt ? new Date(sl.expiresAt) : null,
              createdAt: new Date(sl.createdAt),
            },
          });
          result.shareLinks.imported++;
        } catch (e) {
          console.error('Error importing share link:', sl.id, e);
          result.shareLinks.skipped++;
        }
      }
    }

    // 8. Import CalendarMemberships
    if (data.calendarMemberships) {
      for (const cm of data.calendarMemberships) {
        try {
          if (mode === 'merge') {
            const existing = await db.calendarMembership.findUnique({ where: { id: cm.id } });
            if (existing) {
              result.calendarMemberships.skipped++;
              continue;
            }
          }
          await db.calendarMembership.create({
            data: {
              id: cm.id,
              calendarUserId: cm.calendarUserId,
              memberUserId: cm.memberUserId,
              role: cm.role,
              createdAt: new Date(cm.createdAt),
            },
          });
          result.calendarMemberships.imported++;
        } catch (e) {
          console.error('Error importing membership:', cm.id, e);
          result.calendarMemberships.skipped++;
        }
      }
    }

    // 9. Import Holidays
    if (data.holidays) {
      for (const h of data.holidays) {
        try {
          if (mode === 'merge') {
            const existing = await db.holiday.findFirst({ where: { date: h.date } });
            if (existing) {
              result.holidays.skipped++;
              continue;
            }
          }
          await db.holiday.create({
            data: {
              id: h.id,
              date: h.date,
              name: h.name,
              type: h.type,
              year: h.year,
              createdAt: new Date(h.createdAt),
              updatedAt: new Date(h.updatedAt),
            },
          });
          result.holidays.imported++;
        } catch (e) {
          console.error('Error importing holiday:', h.id, e);
          result.holidays.skipped++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      mode,
      result,
    });
  } catch (error) {
    console.error('Error importing data:', error);
    return NextResponse.json(
      { error: 'Failed to import data: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}
