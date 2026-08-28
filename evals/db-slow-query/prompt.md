This endpoint got slow as we grew. It lists a tenant's orders, newest first, page 400 of the results:

  SELECT * FROM orders
  WHERE tenant_id = $1 AND status = 'paid'
  ORDER BY created_at DESC
  LIMIT 50 OFFSET 20000;

Table has ~40M rows. What do we do?
