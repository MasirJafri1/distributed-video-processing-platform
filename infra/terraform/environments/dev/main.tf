module "vpc" {
  source = "../../modules/vpc"

  project_name = var.project_name
  environment  = var.environment
}

module "iam" {
  source = "../../modules/iam"

  project_name = var.project_name
  environment  = var.environment
}

module "ec2" {
  source = "../../modules/ec2"

  project_name = var.project_name
  environment  = var.environment

  vpc_id                = module.vpc.vpc_id
  public_subnet_id      = module.vpc.public_subnet_id
  instance_profile_name = module.iam.instance_profile_name

  key_name = "video-platform-key"
}

module "s3" {
  source = "../../modules/s3"

  project_name = var.project_name
  environment  = var.environment

  video_queue_arn             = module.sqs.queue_arn
  cloudfront_distribution_arn = module.cloudfront.distribution_arn
}

module "sqs" {
  source = "../../modules/sqs"

  project_name = var.project_name
  environment  = var.environment
}

module "websocket" {
  source = "../../modules/websocket"

  project_name = var.project_name

  environment = var.environment
}

module "acm" {
  source = "../../modules/acm"

  providers = {
    aws = aws.us_east_1
  }

  cdn_domain_name = var.cdn_domain_name
  project_name    = var.project_name
  environment     = var.environment
}

module "cloudfront" {
  source = "../../modules/cloudfront"

  processed_bucket_domain_name = module.s3.processed_bucket_domain_name
  thumbnails_bucket_domain_name = module.s3.thumbnails_bucket_domain_name
  project_name                 = var.project_name
  environment                  = var.environment
  cloudfront_public_key_pem    = file("${path.module}/../../../keys/cloudfront-public.pem")
  acm_certificate_arn          = module.acm.certificate_arn
  cdn_domain_name              = var.cdn_domain_name
}

resource "aws_cloudwatch_log_group" "container_logs" {
  name              = "/aws/container/video-platform-dev"
  retention_in_days = 7
}

resource "aws_cloudwatch_log_metric_filter" "processing_time" {
  name           = "WorkerProcessingTimeFilter"
  pattern        = "{ $.duration = * }"
  log_group_name = aws_cloudwatch_log_group.container_logs.name

  metric_transformation {
    name      = "WorkerProcessingTime"
    namespace = "VideoPlatform"
    value     = "$.duration"
  }
}

resource "aws_cloudwatch_dashboard" "video_platform" {
  dashboard_name = "Video-Platform-Dashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/EC2", "CPUUtilization", "InstanceId", module.ec2.instance_id]
          ]
          period = 60
          stat   = "Average"
          region = "ap-south-1"
          title  = "EC2 CPU Utilization"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["CWAgent", "mem_used_percent", "InstanceId", module.ec2.instance_id]
          ]
          period = 60
          stat   = "Average"
          region = "ap-south-1"
          title  = "EC2 Memory Utilization"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/SQS", "ApproximateNumberOfMessagesVisible", "QueueName", module.sqs.queue_name]
          ]
          period = 60
          stat   = "Maximum"
          region = "ap-south-1"
          title  = "SQS Queue Backlog (Visible Messages)"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/SQS", "ApproximateNumberOfMessagesVisible", "QueueName", module.sqs.dlq_name]
          ]
          period = 60
          stat   = "Maximum"
          region = "ap-south-1"
          title  = "Dead Letter Queue Messages"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 12
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["VideoPlatform", "WorkerProcessingTime"]
          ]
          period = 60
          stat   = "Average"
          region = "ap-south-1"
          title  = "Average Worker Processing Time (ms)"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 12
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/SQS", "NumberOfMessagesSent", "QueueName", module.sqs.queue_name]
          ]
          period = 60
          stat   = "Sum"
          region = "ap-south-1"
          title  = "Upload Count (SQS Sent Messages)"
        }
      }
    ]
  })
}