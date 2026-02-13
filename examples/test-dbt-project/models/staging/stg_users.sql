with source as (
    select * from {{ source('raw', 'users') }}
),

renamed as (
    select
        id,
        email,
        created_at
    from source
)

select * from renamed
