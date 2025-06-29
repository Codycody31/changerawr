- [ ] custom fields
- [x] tags can have a color assigned to them (requires updating the SDKs) - partially done DB side, UI implementation must be done.
    - update tag UI to allow for assigning colors
    - update PHP & React SDK to return this value
    - update changelog entries display, changelog tag picker, changelog API to return tag color

- [x] pwnedpasswords password check
- [x] custom domains (what a headache to implement!)
- [x] scheduled publishing
- [x] full-text search
- [ ] version range comparison (catch-up) thinking a digest of what's been done from here-to-there, could be fun!
- [ ] more changelog customization
  - set a logo for your changelog (thats all ideas for now)
    - requirements:
    - media manager
    - storage providers (s3, local, maybe google drive not sure)
    - enables for reusable media that can be uploaded to the content editor.

- [ ] ability to specify a custom logo for an SSO provider (will be added when I get around to media storage!)
- [ ] update the MCP server so it can use scheduled publishing