import { PrimaryKey } from "@/shared/domain/decorators/primary-key.decorator";
import { PatchableEntity } from "@/shared/domain/entities/patchable-base.entity";

export interface CompanyOptionalProps {
  id?: string
  alias?: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
  parentCompanyId?: string;
}

export class CompanyEntity extends PatchableEntity {
  
  @PrimaryKey()
  public readonly id?: string;
  
  public readonly alias?: string;
  public readonly description?: string;
  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;
  public readonly parentCompanyId?: string;

  constructor(
    public readonly name: string,
    optionals: CompanyOptionalProps = {}
  ) {
    super();

    this.id = optionals.id;
    this.alias = optionals.alias;
    this.description = optionals.description;
    this.createdAt = optionals.createdAt;
    this.updatedAt = optionals.updatedAt;
    this.parentCompanyId = optionals.parentCompanyId;
  }

  toObject(): Record<string, any> {
    return {
      id: this.id,
      name: this.name,
      alias: this.alias,
      description: this.description,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      parentCompanyId: this.parentCompanyId,
    };
  }

  static fromObject(object: Record<string, any>): CompanyEntity {
    return new CompanyEntity(
      object.name,
      {
        id: object.id,
        alias: object.alias,
        description: object.description,
        createdAt: object.createdAt,
        updatedAt: object.updatedAt,
        parentCompanyId: object.parentCompanyId,
      }
    );
  }
}