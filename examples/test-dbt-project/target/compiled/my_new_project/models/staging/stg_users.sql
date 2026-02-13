with source as (
    select * from "raw"."public"."users"
),

renamed as (
    select
        id,
        email,
        created_at
    from source
)

select * from renamed