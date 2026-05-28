output "websocket_endpoint" {

  value = aws_apigatewayv2_stage.websocket_stage.invoke_url
}