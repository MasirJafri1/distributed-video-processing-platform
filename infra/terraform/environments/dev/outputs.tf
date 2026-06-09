output "elastic_ip" {
  value = module.ec2.elastic_ip
}

output "websocket_endpoint" {
  value = module.websocket.websocket_endpoint
}

output "cloudfront_domain" {
  value = module.cloudfront.distribution_domain_name
}