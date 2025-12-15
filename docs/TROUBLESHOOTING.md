# Troubleshooting

## Common Issues

### Database Connection Failed
- Check Supabase URL in `.env.local`
- Verify service role key is correct
- Check if Supabase project is active

### Build Errors
- Clear `.next` folder: `rm -rf .next`
- Delete `node_modules` and reinstall: `npm install`
- Check for TypeScript errors: `npm run build`

### Realtime Not Working
- Enable realtime in Supabase dashboard
- Check table replication settings
- Verify RLS policies allow reading

For more help, see the full analysis document.
