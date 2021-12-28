import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class addIsPosted1640685289536 implements MigrationInterface {

    private tableName = 'info_model';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(this.tableName, new TableColumn({
            name: "isPosted",
            type: "boolean",
            default: false,
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn(this.tableName, 'isPosted');
    }
}
