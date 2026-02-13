import Ajv, { JSONSchemaType } from 'ajv';
import { Contract } from './contract-types';
import * as yaml from 'js-yaml';
import * as fs from 'fs';

const ajv = new Ajv({ allErrors: true });

const contractSchema: JSONSchemaType<Contract> = {
    type: "object",
    properties: {
        version: { type: "string", pattern: "^1\\.0$" },
        contract: {
            type: "object",
            properties: {
                name: { type: "string" },
                owner: { type: "string" },
                description: { type: "string", nullable: true },
                resource: {
                    type: "object",
                    properties: {
                        type: { type: "string", enum: ["dbt_model", "postgres_table", "kafka_topic"] },
                        name: { type: "string" },
                        location: { type: "string", nullable: true }
                    },
                    required: ["type", "name"]
                },
                enforcement_level: { type: "string", enum: ["strict", "warn", "none"] },
                consumers: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            name: { type: "string" },
                            owner: { type: "string" },
                            criticality: { type: "string", enum: ["high", "medium", "low"] },
                            point_of_contact: { type: "string", nullable: true }
                        },
                        required: ["name", "owner", "criticality"]
                    },
                    nullable: true
                },
                schema: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            name: { type: "string" },
                            type: { type: "string" },
                            nullable: { type: "boolean", nullable: true },
                            description: { type: "string", nullable: true },
                            defaultValue: { type: "string", nullable: true }
                        },
                        required: ["name", "type"]
                    },
                    nullable: true
                },
                schema_config: {
                    type: "object",
                    properties: {
                        require_descriptions: { type: "boolean", nullable: true },
                        forbid_breaking_changes: { type: "boolean", nullable: true }
                    },
                    nullable: true
                }
            },
            required: ["name", "owner", "resource", "enforcement_level"]
        }
    },
    required: ["version", "contract"]
};

const validate = ajv.compile(contractSchema);

export interface ValidationResult {
    valid: boolean;
    errors?: string[];
}

export function validateContract(filePath: string): ValidationResult {
    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const data = yaml.load(fileContent);

        const valid = validate(data);

        if (!valid) {
            return {
                valid: false,
                errors: validate.errors?.map(e => `${e.instancePath} ${e.message}`)
            };
        }

        return { valid: true };
    } catch (e: any) {
        return {
            valid: false,
            errors: [`Failed to parse or read file: ${e.message}`]
        };
    }
}

export function validateContractContent(content: object): ValidationResult {
    const valid = validate(content);
    if (!valid) {
        return {
            valid: false,
            errors: validate.errors?.map(e => `${e.instancePath} ${e.message}`)
        };
    }
    return { valid: true };
}
