import {MigrationInterface, QueryRunner} from "typeorm";

export class addTagColumn1639403943213 implements MigrationInterface {
    name = 'addTagColumn1639403943213'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "temporary_info_model" ("threadId" integer PRIMARY KEY NOT NULL, "title" text NOT NULL, "actors" text NOT NULL, "format" text NOT NULL, "postId" text NOT NULL, "size" text NOT NULL, "isBlurred" boolean NOT NULL, "sig" text NOT NULL, "thumbnails" text NOT NULL, "torrentLink" text NOT NULL, "category" text NOT NULL, "tag" text DEFAULT (''))`);
        await queryRunner.query(`INSERT INTO "temporary_info_model"("threadId", "title", "actors", "format", "postId", "size", "isBlurred", "sig", "thumbnails", "torrentLink", "category") SELECT "threadId", "title", "actors", "format", "postId", "size", "isBlurred", "sig", "thumbnails", "torrentLink", "category" FROM "info_model"`);
        await queryRunner.query(`DROP TABLE "info_model"`);
        await queryRunner.query(`ALTER TABLE "temporary_info_model" RENAME TO "info_model"`);
        await queryRunner.query(`CREATE TABLE "temporary_info_model" ("threadId" integer PRIMARY KEY NOT NULL, "title" text DEFAULT (''), "actors" text DEFAULT (''), "format" text DEFAULT (''), "postId" text DEFAULT (''), "size" text DEFAULT (''), "isBlurred" boolean DEFAULT (1), "sig" text DEFAULT (''), "thumbnails" text DEFAULT (''), "torrentLink" text DEFAULT (''), "category" text DEFAULT (''), "tag" text DEFAULT (''))`);
        await queryRunner.query(`INSERT INTO "temporary_info_model"("threadId", "title", "actors", "format", "postId", "size", "isBlurred", "sig", "thumbnails", "torrentLink", "category", "tag") SELECT "threadId", "title", "actors", "format", "postId", "size", "isBlurred", "sig", "thumbnails", "torrentLink", "category", "tag" FROM "info_model"`);
        await queryRunner.query(`DROP TABLE "info_model"`);
        await queryRunner.query(`ALTER TABLE "temporary_info_model" RENAME TO "info_model"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "info_model" RENAME TO "temporary_info_model"`);
        await queryRunner.query(`CREATE TABLE "info_model" ("threadId" integer PRIMARY KEY NOT NULL, "title" text NOT NULL, "actors" text NOT NULL, "format" text NOT NULL, "postId" text NOT NULL, "size" text NOT NULL, "isBlurred" boolean NOT NULL, "sig" text NOT NULL, "thumbnails" text NOT NULL, "torrentLink" text NOT NULL, "category" text NOT NULL, "tag" text DEFAULT (''))`);
        await queryRunner.query(`INSERT INTO "info_model"("threadId", "title", "actors", "format", "postId", "size", "isBlurred", "sig", "thumbnails", "torrentLink", "category", "tag") SELECT "threadId", "title", "actors", "format", "postId", "size", "isBlurred", "sig", "thumbnails", "torrentLink", "category", "tag" FROM "temporary_info_model"`);
        await queryRunner.query(`DROP TABLE "temporary_info_model"`);
        await queryRunner.query(`ALTER TABLE "info_model" RENAME TO "temporary_info_model"`);
        await queryRunner.query(`CREATE TABLE "info_model" ("threadId" integer PRIMARY KEY NOT NULL, "title" text NOT NULL, "actors" text NOT NULL, "format" text NOT NULL, "postId" text NOT NULL, "size" text NOT NULL, "isBlurred" boolean NOT NULL, "sig" text NOT NULL, "thumbnails" text NOT NULL, "torrentLink" text NOT NULL, "category" text NOT NULL)`);
        await queryRunner.query(`INSERT INTO "info_model"("threadId", "title", "actors", "format", "postId", "size", "isBlurred", "sig", "thumbnails", "torrentLink", "category") SELECT "threadId", "title", "actors", "format", "postId", "size", "isBlurred", "sig", "thumbnails", "torrentLink", "category" FROM "temporary_info_model"`);
        await queryRunner.query(`DROP TABLE "temporary_info_model"`);
    }

}
