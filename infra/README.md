# Infra folder
# Cloudflare Workers configuration lives in apps/redirect/wrangler.toml
# Run `wrangler deploy` from apps/redirect to deploy the edge redirect worker

# Useful commands:
#   wrangler kv:namespace create "LINKSNAP_KV"         -- Create KV namespace
#   wrangler kv:namespace create "LINKSNAP_KV" --preview -- Create preview KV namespace
#   wrangler secret put REDIS_URL                        -- Set Redis secret
#   wrangler secret put DATABASE_URL                     -- Set DB secret
#   wrangler tail                                        -- Live log streaming
