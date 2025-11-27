export class metaCustomHidedText1754276953000 {
	name = 'metaCustomHidedText1754276953000'

	async up(queryRunner) {
		await queryRunner.query(`ALTER TABLE "meta" ADD "customHidedNoteLightText" varchar(2000) NULL DEFAULT '(<reason>)'`);
		await queryRunner.query(`ALTER TABLE "meta" ADD "customHidedNoteDarkText" varchar(2000) NULL DEFAULT '(<reason>)'`);
	}

	async down(queryRunner) {
		await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "customHidedNoteLightText"`);
		await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "customHidedNoteDarkText"`);
	}
}
