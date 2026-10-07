import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";
export const goals = sqliteTable("goals", {
  userId: text("user_id").notNull(), id: text("id").notNull(), label: text("label").notNull(), detail: text("detail").notNull().default(""), icon: text("icon").notNull().default("target"), builtin: integer("builtin").notNull().default(0), startDate: text("start_date").notNull(), endDate: text("end_date"), position: integer("position").notNull().default(0),
}, t => [primaryKey({ columns: [t.userId, t.id] })]);
export const checkins = sqliteTable("checkins", {
  userId: text("user_id").notNull(), date: text("date").notNull(), goalId: text("goal_id").notNull(), checked: integer("checked").notNull().default(0),
}, t => [primaryKey({ columns: [t.userId, t.date, t.goalId] })]);
