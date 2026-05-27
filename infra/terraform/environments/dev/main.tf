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

  video_queue_arn = module.sqs.queue_arn
}

module "sqs" {
  source = "../../modules/sqs"

  project_name = var.project_name
  environment  = var.environment
}