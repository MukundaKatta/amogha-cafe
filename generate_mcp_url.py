from composio import Composio

COMPOSIO_API_KEY = "ak_407ngotUt43Hrxb8NF73"
USER_ID = "mukunda"

composio = Composio(api_key=COMPOSIO_API_KEY)

# Create MCP server for LinkedIn
server = composio.mcp.create(
    name="my-linkedin-server",
    toolkits=[{
        "toolkit": "linkedin",
        "auth_config": "ac_w26tHEXPRA_n"
    }]
)

# Generate user URL
instance = composio.mcp.generate(user_id=USER_ID, mcp_config_id=server.id)
url = instance['url']

print(f"\nRun this command:")
print(f'claude mcp add --transport http linkedin-composio "{url}" --header "X-API-Key:{COMPOSIO_API_KEY}"')
