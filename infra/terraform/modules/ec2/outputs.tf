output "public_ip" {
  value = aws_instance.app_server.public_ip
}

output "elastic_ip" {
  value = aws_eip.video_platform_eip.public_ip
}