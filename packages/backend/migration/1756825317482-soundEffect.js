export class soundEffect1756825317482 {
	name = 'soundEffect1756825317482'

	async up(queryRunner) {
		await queryRunner.query(`
			CREATE TABLE "sound_effects" (
				"id" character varying(32) NOT NULL,
				"updatedAt" TIMESTAMP WITH TIME ZONE,
				"name" character varying(128) NOT NULL,
				"host" character varying(512),
				"originalUrl" character varying(512),
				"uri" character varying(512),
				"type" character varying(64),
				"aliases" jsonb NOT NULL DEFAULT '[]',
				"category" character varying(128),
				"publicUrl" character varying(512),
				"license" character varying(256),
				"length" integer,
				"placeText" character varying(256),
				"localOnly" boolean NOT NULL DEFAULT false,
				"isSensitive" boolean NOT NULL DEFAULT false,
				CONSTRAINT "PK_sound_effects" PRIMARY KEY ("id")
			)
		`);
		await queryRunner.query(`CREATE INDEX "IDX_5352b627f368565609c6d6dd32" ON "sound_effects" ("host")`);
		await queryRunner.query(`CREATE INDEX "IDX_20d7c4acc1e3c27a9f9ee0eb8c" ON "sound_effects" ("name")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_5cb35a7ddf18077aee799567a1" ON "sound_effects" ("name", "host") `);
	}

	async down(queryRunner) {
		await queryRunner.query(`DROP INDEX "IDX_5cb35a7ddf18077aee799567a1"`);
		await queryRunner.query(`DROP INDEX "IDX_20d7c4acc1e3c27a9f9ee0eb8c"`);
		await queryRunner.query(`DROP INDEX "IDX_5352b627f368565609c6d6dd32"`);
		await queryRunner.query(`DROP TABLE "sound_effects"`);
	}
}
