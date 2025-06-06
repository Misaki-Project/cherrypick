export class addLevelPolicies1749166675855 {
	name = 'addLevelPolicies1749166675855'

	async up(queryRunner) {
			await queryRunner.query(`ALTER TABLE "role" ADD "canHideProfileByUser" boolean NOT NULL DEFAULT false`);
			await queryRunner.query(`ALTER TABLE "role_assignment" ADD "isHideProfile" boolean DEFAULT NULL`);
	}

	async down(queryRunner) {
		await queryRunner.query(`ALTER TABLE "role_assignment" DROP COLUMN "isHideProfile"`);
		await queryRunner.query(`ALTER TABLE "role" DROP COLUMN "canHideProfileByUser"`);
	}
}
