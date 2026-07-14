import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  avatar: text("avatar"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const friendships = pgTable("friendships", {
  id: serial("id").primaryKey(),
  requesterId: integer("requester_id").notNull(),
  addresseeId: integer("addressee_id").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  maxMembers: integer("max_members").notNull().default(4),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const roomMembers = pgTable("room_members", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull(),
  userId: integer("user_id").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const roomRequests = pgTable("room_requests", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull(),
  userId: integer("user_id").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull(),
  userId: integer("user_id").notNull(),
  kind: text("kind").notNull().default("voice"),
  effect: text("effect").notNull().default("normal"),
  audio: text("audio").notNull(),
  durationMs: integer("duration_ms").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
