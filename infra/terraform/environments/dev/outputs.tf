output "elastic_ip" {
  value = module.ec2.elastic_ip
}

output "websocket_endpoint" {
  value = module.websocket.websocket_endpoint
}

output "cloudfront_domain" {
  value = module.cloudfront.distribution_domain_name
}

output "cloudfront_key_pair_id" {
  value       = module.cloudfront.cloudfront_key_pair_id
  description = "Set this as CLOUDFRONT_KEY_PAIR_ID in backend .env"
}

output "acm_validation_records" {
  value       = module.acm.domain_validation_options
  description = "Add these CNAME records in Namecheap to validate the ACM certificate"
}