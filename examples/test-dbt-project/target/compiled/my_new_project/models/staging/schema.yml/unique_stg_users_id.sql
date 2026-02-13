
    
    

select
    id as unique_field,
    count(*) as n_records

from "picket_db"."public"."stg_users"
where id is not null
group by id
having count(*) > 1


