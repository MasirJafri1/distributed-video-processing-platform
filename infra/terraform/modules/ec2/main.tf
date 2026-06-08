resource "aws_security_group" "ec2_sg" {
  name        = "${var.project_name}-${var.environment}-sg"
  description = "Security group for EC2"
  vpc_id      = var.vpc_id

  ingress {
    description = "SSH"

    from_port = 22
    to_port   = 22
    protocol  = "tcp"

    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP"

    from_port = 80
    to_port   = 80
    protocol  = "tcp"

    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "App Port"

    from_port = 3000
    to_port   = 3000
    protocol  = "tcp"

    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port = 0
    to_port   = 0
    protocol  = "-1"

    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-sg"
  }
}

resource "aws_instance" "app_server" {
  ami           = "ami-03bb6d83c60fc5f7c"
  instance_type = "t3.small"

  subnet_id = var.public_subnet_id

  vpc_security_group_ids = [
    aws_security_group.ec2_sg.id
  ]

  iam_instance_profile = var.instance_profile_name

  key_name = var.key_name

  associate_public_ip_address = true

  root_block_device {
    volume_size           = 30
    volume_type           = "gp2"
    delete_on_termination = true
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-server"
  }
}

resource "aws_eip" "video_platform_eip" {

  domain = "vpc"

  tags = {
    Name = "${var.project_name}-${var.environment}-eip"
  }
}

resource "aws_eip_association" "video_platform_eip_assoc" {

  instance_id = aws_instance.app_server.id

  allocation_id = aws_eip.video_platform_eip.id
}