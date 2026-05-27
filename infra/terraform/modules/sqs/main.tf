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

resource "aws_sqs_queue_policy" "allow_s3" {

  queue_url = aws_sqs_queue.video_processing_queue.id

  policy = jsonencode({

    Version = "2012-10-17"

    Statement = [
      {
        Sid = "AllowS3SendMessage"

        Effect = "Allow"

        Principal = {
          Service = "s3.amazonaws.com"
        }

        Action = "sqs:SendMessage"

        Resource = aws_sqs_queue.video_processing_queue.arn
      }
    ]
  })
}