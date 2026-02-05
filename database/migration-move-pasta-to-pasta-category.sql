-- Yiyecekler (food) kategorisindeki makarna ürünlerini Makarnalar (pasta) kategorisine taşı

UPDATE content_library 
SET category = 'pasta'
WHERE category = 'food' 
AND (
  name ILIKE '%spaghetti%' OR name ILIKE '%carbonara%' OR name ILIKE '%penne%' 
  OR name ILIKE '%arrabbiata%' OR name ILIKE '%arrabiata%' OR name ILIKE '%fettuccine%'
  OR name ILIKE '%alfredo%' OR name ILIKE '%lasagna%' OR name ILIKE '%ravioli%'
  OR name ILIKE '%gnocchi%' OR name ILIKE '%linguine%' OR name ILIKE '%rigatoni%'
  OR name ILIKE '%fusilli%' OR name ILIKE '%macaroni%' OR name ILIKE '%tagliatelle%'
  OR name ILIKE '%pappardelle%' OR name ILIKE '%spagetti%'
);
