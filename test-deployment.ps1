$baseUrl = "http://localhost:3001"
$testUser = @{
    name = "Test User"
    email = "test@example.com"
    password = "password123"
}

function Test-Auth {
    Write-Host "Testing Authentication Flow..."
    
    # Register new user
    Write-Host "1. Registering new user..."
    $registerResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method Post -Body ($testUser | ConvertTo-Json) -ContentType "application/json"
    Write-Host "Registration response: $($registerResponse | ConvertTo-Json)"
    
    # Login with correct credentials
    Write-Host "2. Logging in with correct credentials..."
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body (@{
        email = $testUser.email
        password = $testUser.password
    } | ConvertTo-Json) -ContentType "application/json"
    Write-Host "Login response: $($loginResponse | ConvertTo-Json)"
    
    $token = $loginResponse.token
    
    # Test protected route
    Write-Host "3. Testing protected route..."
    $protectedResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/me" -Method Get -Headers @{
        Authorization = "Bearer $token"
    }
    Write-Host "Protected route response: $($protectedResponse | ConvertTo-Json)"
}

function Test-WebSocket {
    Write-Host "Testing WebSocket Connection..."
    
    # Create WebSocket connection
    $ws = New-Object System.Net.WebSockets.ClientWebSocket
    $cts = New-Object System.Threading.CancellationTokenSource
    $uri = New-Object System.Uri("ws://localhost:3001")
    
    try {
        $ws.ConnectAsync($uri, $cts.Token).Wait()
        Write-Host "WebSocket connected successfully"
        
        # Send test message
        $message = [System.Text.Encoding]::UTF8.GetBytes("Test message")
        $ws.SendAsync([System.ArraySegment[byte]]::new($message), [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $cts.Token).Wait()
        Write-Host "Test message sent"
        
        # Receive response
        $buffer = New-Object byte[] 1024
        $result = $ws.ReceiveAsync([System.ArraySegment[byte]]::new($buffer), $cts.Token).Result
        $response = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $result.Count)
        Write-Host "Received response: $response"
    }
    catch {
        Write-Host "WebSocket error: $_"
    }
    finally {
        $ws.Dispose()
        $cts.Dispose()
    }
}

# Run tests
Test-Auth
Test-WebSocket 