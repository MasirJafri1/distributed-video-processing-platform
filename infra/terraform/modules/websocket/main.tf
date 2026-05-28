resource "aws_apigatewayv2_api" "websocket_api" {

  name = "${var.project_name}-${var.environment}-websocket"

  protocol_type = "WEBSOCKET"

  route_selection_expression = "$request.body.action"
}

resource "aws_apigatewayv2_stage" "websocket_stage" {

  api_id = aws_apigatewayv2_api.websocket_api.id

  name = "production"

  auto_deploy = true
}