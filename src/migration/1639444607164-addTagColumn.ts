import { MigrationInterface, QueryRunner } from "typeorm";

export default class addTagColumn1639444607164 implements MigrationInterface {
    public name = 'addTagColumn1639444607164';
    private tableName = 'info_model';

    public async up(queryRunner: QueryRunner) {
        await queryRunner.query(`ALTER TABLE ${this.tableName} ADD COLUMN tag text DEFAULT('')`);
    }

    public async down(queryRunner: QueryRunner) {
        await queryRunner.dropColumn(this.tableName, 'tag');
    }
}
