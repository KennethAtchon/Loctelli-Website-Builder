#!/bin/bash

# Loctelli CRM - Security Check Script
# This script validates security configurations before production deployment

set -e

echo "🔒 Loctelli CRM Security Check"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✅ PASS${NC}: $message"
    elif [ "$status" = "FAIL" ]; then
        echo -e "${RED}❌ FAIL${NC}: $message"
    elif [ "$status" = "WARN" ]; then
        echo -e "${YELLOW}⚠️  WARN${NC}: $message"
    fi
}

# Function to check if environment variable is set and secure
check_env_var() {
    local var_name=$1
    local var_value=$2
    local is_required=$3
    
    if [ -z "$var_value" ]; then
        if [ "$is_required" = "true" ]; then
            print_status "FAIL" "$var_name is not set"
            return 1
        else
            print_status "WARN" "$var_name is not set (optional)"
            return 0
        fi
    fi
    
    # Check for default/weak values
    if [[ "$var_value" == *"your-super-secret"* ]] || \
       [[ "$var_value" == *"your-api-key"* ]] || \
       [[ "$var_value" == *"ADMIN_2024_SECURE"* ]] || \
       [[ "$var_value" == *"password"* ]]; then
        print_status "FAIL" "$var_name contains default/weak value"
        return 1
    fi
    
    # Check minimum length
    if [ ${#var_value} -lt 16 ]; then
        print_status "FAIL" "$var_name is too short (minimum 16 characters)"
        return 1
    fi
    
    print_status "PASS" "$var_name is properly configured"
    return 0
}

# Function to check file permissions
check_file_permissions() {
    local file_path=$1
    local expected_perms=$2
    
    if [ ! -f "$file_path" ]; then
        print_status "WARN" "$file_path does not exist"
        return 0
    fi
    
    local perms=$(stat -c %a "$file_path")
    if [ "$perms" = "$expected_perms" ]; then
        print_status "PASS" "$file_path has correct permissions ($perms)"
    else
        print_status "FAIL" "$file_path has incorrect permissions ($perms, expected $expected_perms)"
        return 1
    fi
}

# Function to check if port is open
check_port() {
    local port=$1
    local service=$2
    
    if netstat -tuln | grep -q ":$port "; then
        print_status "WARN" "$service is listening on port $port"
    else
        print_status "PASS" "$service is not exposed on port $port"
    fi
}

# Function to check SSL certificate
check_ssl() {
    local domain=$1
    if [ -z "$domain" ]; then
        print_status "WARN" "No domain specified for SSL check"
        return 0
    fi
    
    if command -v openssl >/dev/null 2>&1; then
        if openssl s_lead -connect "$domain:443" -servername "$domain" </dev/null 2>/dev/null | grep -q "Verify return code: 0"; then
            print_status "PASS" "SSL certificate for $domain is valid"
        else
            print_status "FAIL" "SSL certificate for $domain is invalid or missing"
            return 1
        fi
    else
        print_status "WARN" "OpenSSL not available, skipping SSL check"
    fi
}

# Main security checks
echo ""
echo "1. Environment Variables Check"
echo "-------------------------------"

# Load environment variables
if [ -f ".env" ]; then
    source .env
elif [ -f "project/.env" ]; then
    source project/.env
else
    print_status "WARN" "No .env file found"
fi

# Check required environment variables
check_env_var "JWT_SECRET" "$JWT_SECRET" "true"
check_env_var "API_KEY" "$API_KEY" "true"
check_env_var "ADMIN_AUTH_CODE" "$ADMIN_AUTH_CODE" "true"
check_env_var "DEFAULT_ADMIN_PASSWORD" "$DEFAULT_ADMIN_PASSWORD" "true"
check_env_var "DATABASE_URL" "$DATABASE_URL" "true"
check_env_var "REDIS_URL" "$REDIS_URL" "true"

# Check optional but recommended variables
check_env_var "REDIS_PASSWORD" "$REDIS_PASSWORD" "false"
check_env_var "FRONTEND_URL" "$FRONTEND_URL" "false"

echo ""
echo "2. File Permissions Check"
echo "-------------------------"

# Check sensitive files
check_file_permissions ".env" "600"
check_file_permissions "project/.env" "600"
check_file_permissions "my-app/.env.local" "600"
check_file_permissions "docker-compose.yml" "644"

echo ""
echo "3. Network Security Check"
echo "-------------------------"

# Check if sensitive ports are exposed
check_port "5432" "PostgreSQL"
check_port "6379" "Redis"
check_port "8000" "Backend API"
check_port "3000" "Frontend"

echo ""
echo "4. SSL/TLS Check"
echo "----------------"

# Check SSL if domain is provided
if [ ! -z "$FRONTEND_URL" ]; then
    domain=$(echo "$FRONTEND_URL" | sed 's|https://||' | sed 's|http://||' | sed 's|/.*||')
    check_ssl "$domain"
fi

echo ""
echo "5. Docker Security Check"
echo "------------------------"

# Check if Docker is running
if command -v docker >/dev/null 2>&1; then
    if docker info >/dev/null 2>&1; then
        print_status "PASS" "Docker is running"
        
        # Check for running containers
        container_count=$(docker ps -q | wc -l)
        if [ "$container_count" -gt 0 ]; then
            print_status "PASS" "$container_count containers are running"
        else
            print_status "WARN" "No containers are running"
        fi
    else
        print_status "FAIL" "Docker is not running or not accessible"
    fi
else
    print_status "WARN" "Docker is not installed"
fi

echo ""
echo "6. Dependencies Security Check"
echo "-------------------------------"

# Check for known vulnerabilities in dependencies
if command -v npm >/dev/null 2>&1; then
    if [ -f "project/package.json" ]; then
        cd project
        if npm audit --audit-level=high >/dev/null 2>&1; then
            print_status "PASS" "No high-severity vulnerabilities found in backend dependencies"
        else
            print_status "FAIL" "High-severity vulnerabilities found in backend dependencies"
            echo "Run 'npm audit' in the project directory for details"
        fi
        cd ..
    fi
    
    if [ -f "my-app/package.json" ]; then
        cd my-app
        if npm audit --audit-level=high >/dev/null 2>&1; then
            print_status "PASS" "No high-severity vulnerabilities found in frontend dependencies"
        else
            print_status "FAIL" "High-severity vulnerabilities found in frontend dependencies"
            echo "Run 'npm audit' in the my-app directory for details"
        fi
        cd ..
    fi
else
    print_status "WARN" "npm not available, skipping dependency check"
fi

echo ""
echo "7. Database Security Check"
echo "--------------------------"

# Check database connection
if [ ! -z "$DATABASE_URL" ]; then
    if command -v psql >/dev/null 2>&1; then
        if psql "$DATABASE_URL" -c "SELECT 1;" >/dev/null 2>&1; then
            print_status "PASS" "Database connection is working"
        else
            print_status "FAIL" "Cannot connect to database"
        fi
    else
        print_status "WARN" "PostgreSQL lead not available, skipping database connection check"
    fi
fi

echo ""
echo "8. Application Health Check"
echo "---------------------------"

# Check if application is responding
if [ ! -z "$FRONTEND_URL" ]; then
    if command -v curl >/dev/null 2>&1; then
        if curl -f -s "$FRONTEND_URL" >/dev/null 2>&1; then
            print_status "PASS" "Frontend is responding"
        else
            print_status "FAIL" "Frontend is not responding"
        fi
    else
        print_status "WARN" "curl not available, skipping health check"
    fi
fi

echo ""
echo "9. Security Recommendations"
echo "---------------------------"

echo -e "${YELLOW}🔐 Security Recommendations:${NC}"
echo "1. Use HTTPS in production"
echo "2. Enable database SSL connections"
echo "3. Set up firewall rules"
echo "4. Configure automated backups"
echo "5. Set up monitoring and alerting"
echo "6. Regular security updates"
echo "7. Implement log monitoring"
echo "8. Set up intrusion detection"
echo "9. Configure rate limiting"
echo "10. Enable audit logging"

echo ""
echo "🔒 Security Check Complete"
echo "=========================="

# Exit with error if any critical checks failed
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Security check failed. Please address the issues above before deployment.${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Security check passed. Application is ready for deployment.${NC}"
fi 