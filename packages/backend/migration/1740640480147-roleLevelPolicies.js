export class addLevelPolicies1740640480147 {
	name = 'addLevelPolicies1740640480147'

	async up(queryRunner) {
			await queryRunner.query(`ALTER TABLE "role" ADD "levelPolicies" jsonb NOT NULL DEFAULT '{}'`);
			await queryRunner.query(`ALTER TABLE "role" ALTER COLUMN "policies" SET DEFAULT '{}'::jsonb`);
			await queryRunner.query(`ALTER TABLE "role_assignment" ADD "experience" bigint DEFAULT NULL`);
			await queryRunner.query(`CREATE INDEX "IDX_3a2b1f9d4e8c0f7b5a6d2e9c4f8b3" ON "role_assignment" ("experience")`);
			await queryRunner.query(`ALTER TYPE "public"."role_target_enum" ADD VALUE 'manualLevel'`);
	}

	async down(queryRunner) {
    await queryRunner.query(`CREATE TYPE "role_target_enum_new" AS ENUM ('manual', 'conditional')`);
    await queryRunner.query(`
        ALTER TABLE "role"
        ALTER COLUMN "target" TYPE "role_target_enum_new"
        USING "target"::text::"role_target_enum_new"
    `);
    await queryRunner.query(`DROP TYPE "role_target_enum"`);
    await queryRunner.query(`ALTER TYPE "role_target_enum_new" RENAME TO "role_target_enum"`);
		await queryRunner.query(`DROP INDEX "IDX_3a2b1f9d4e8c0f7b5a6d2e9c4f8b3"`);
		await queryRunner.query(`ALTER TABLE "role_assignment" DROP COLUMN "experience"`);
		await queryRunner.query(`ALTER TABLE "role" DROP COLUMN "levelPolicies"`);
		await queryRunner.query(`ALTER TABLE "role" ALTER COLUMN "policies" SET DEFAULT '{}'::jsonb`);
	}
}
