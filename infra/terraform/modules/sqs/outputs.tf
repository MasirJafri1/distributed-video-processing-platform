output "queue_url" {
  value = aws_sqs_queue.video_processing_queue.id
}

output "queue_name" {
  value = aws_sqs_queue.video_processing_queue.name
}