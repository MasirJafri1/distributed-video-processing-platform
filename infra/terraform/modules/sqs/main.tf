resource "aws_sqs_queue" "dead_letter_queue" {
  name = "${var.project_name}-${var.environment}-dlq"
}

resource "aws_sqs_queue" "video_processing_queue" {
  name = "${var.project_name}-${var.environment}-video-processing"

  visibility_timeout_seconds = 300

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dead_letter_queue.arn
    maxReceiveCount     = 3
  })
}