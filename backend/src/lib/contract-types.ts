export type EnforcementLevel = 'strict' | 'warn' | 'none';

export interface ResourceIdentifier {
    type: 'dbt_model' | 'postgres_table' | 'kafka_topic';
    name: string; // e.g. "stg_users", "public.users", "user_events"
    location?: string; // Optional: database name, cluster, etc.
}

export interface Consumer {
    name: string;
    owner: string;
    criticality: 'high' | 'medium' | 'low';
    point_of_contact?: string; // email or slack
}

export interface SchemaConfig {
    // We can add specific schema enforcement rules here later
    // For example, requiring descriptions for all columns
    require_descriptions?: boolean;
    forbid_breaking_changes?: boolean;
}

export interface ContractColumn {
    name: string;
    type: string;
    nullable?: boolean;
    description?: string;
    defaultValue?: string;
}

export interface Contract {
    version: string; // "1.0"
    contract: {
        name: string;
        owner: string;
        resource: ResourceIdentifier;
        enforcement_level: EnforcementLevel;
        consumers?: Consumer[];
        schema?: ContractColumn[]; // Ordered list of required columns
        schema_config?: SchemaConfig;
        description?: string;
    };
}
