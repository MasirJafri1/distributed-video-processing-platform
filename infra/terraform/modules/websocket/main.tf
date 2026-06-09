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

resource "aws_apigatewayv2_integration" "connect_integration" {
  api_id             = aws_apigatewayv2_api.websocket_api.id
  integration_type   = "HTTP_PROXY"
  integration_uri    = "https://video-processing-api.masir-projects.me/websocket/connect"
  integration_method = "POST"
}

resource "aws_apigatewayv2_route" "connect_route" {
  api_id    = aws_apigatewayv2_api.websocket_api.id
  route_key = "$connect"
  target    = "integrations/${aws_apigatewayv2_integration.connect_integration.id}"
}

resource "aws_apigatewayv2_integration" "disconnect_integration" {
  api_id             = aws_apigatewayv2_api.websocket_api.id
  integration_type   = "HTTP_PROXY"
  integration_uri    = "https://video-processing-api.masir-projects.me/websocket/disconnect"
  integration_method = "POST"
}

resource "aws_apigatewayv2_route" "disconnect_route" {
  api_id    = aws_apigatewayv2_api.websocket_api.id
  route_key = "$disconnect"
  target    = "integrations/${aws_apigatewayv2_integration.disconnect_integration.id}"
}