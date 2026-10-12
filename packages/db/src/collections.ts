import {
  createRxDatabase,
  RxDatabase,
  RxCollection,
  addRxPlugin,
} from 'rxdb';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';
import type { Report, UserProfile, SeverityLevel } from '@blackout/types';
import { reportRxSchema, userRxSchema } from './schema';

// Register standard utility plugins
if (process.env.NODE_ENV !== 'production') {
  addRxPlugin(RxDBDevModePlugin);
}
addRxPlugin(RxDBQueryBuilderPlugin);
addRxPlugin(RxDBUpdatePlugin);

export type ReportCollection = RxCollection<Report>;
export type UserCollection = RxCollection<UserProfile>;

export interface BlackoutCollections {
  reports: ReportCollection;
  users: UserCollection;
}

export type BlackoutDatabase = RxDatabase<BlackoutCollections>;

export interface DatabaseInitOptions {
  name?: string;
  storage: any; // RxStorage adapter (Dexie, SQLite, Memory, etc.)
  password?: string;
  multiInstance?: boolean;
}

export async function createBlackoutDatabase(
  options: DatabaseInitOptions
): Promise<BlackoutDatabase> {
  const db = await createRxDatabase<BlackoutCollections>({
    name: options.name || 'blackout_db',
    storage: options.storage,
    password: options.password,
    multiInstance: options.multiInstance ?? false,
    ignoreDuplicate: true,
  });

  await db.addCollections({
    reports: {
      schema: reportRxSchema,
    },
    users: {
      schema: userRxSchema,
    },
  });

  return db;
}

export class BlackoutRepository {
  constructor(private db: BlackoutDatabase) {}

  public async upsertReport(report: Report): Promise<Report> {
    const doc = await this.db.reports.upsert(report);
    return doc.toJSON() as Report;
  }

  public async getReportById(id: string): Promise<Report | null> {
    const doc = await this.db.reports.findOne(id).exec();
    return doc ? (doc.toJSON() as Report) : null;
  }

  public async getAllReports(): Promise<Report[]> {
    const docs = await this.db.reports.find().exec();
    return docs.map((d) => d.toJSON() as Report);
  }

  public async getPendingSyncReports(): Promise<Report[]> {
    const docs = await this.db.reports
      .find({
        selector: {
          syncState: 'LOCAL_PENDING',
        },
      })
      .exec();
    return docs.map((d) => d.toJSON() as Report);
  }

  public async getReportsBySeverity(severity: SeverityLevel): Promise<Report[]> {
    const docs = await this.db.reports
      .find({
        selector: {
          severity,
        },
      })
      .exec();
    return docs.map((d) => d.toJSON() as Report);
  }

  public async upsertUser(user: UserProfile): Promise<UserProfile> {
    const doc = await this.db.users.upsert(user);
    return doc.toJSON() as UserProfile;
  }

  public async getUser(id: string): Promise<UserProfile | null> {
    const doc = await this.db.users.findOne(id).exec();
    return doc ? (doc.toJSON() as UserProfile) : null;
  }
}
