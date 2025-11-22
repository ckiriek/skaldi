# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - banner [ref=e3]:
      - generic [ref=e4]:
        - link "Skaldi" [ref=e5] [cursor=pointer]:
          - /url: /dashboard
          - img "Skaldi" [ref=e6]
        - generic [ref=e7]:
          - navigation [ref=e8]:
            - link "Dashboard" [ref=e9] [cursor=pointer]:
              - /url: /dashboard
              - img [ref=e10]
              - text: Dashboard
            - link "Settings" [ref=e15] [cursor=pointer]:
              - /url: /dashboard/settings
              - img [ref=e16]
              - text: Settings
          - button "Admin User AD" [ref=e20] [cursor=pointer]:
            - paragraph [ref=e22]: Admin User
            - generic [ref=e24]: AD
    - main [ref=e25]:
      - generic [ref=e26]:
        - heading "Something went wrong!" [level=2] [ref=e27]
        - generic [ref=e28]: Cannot read properties of undefined (reading 'filter')
        - button "Try again" [ref=e29] [cursor=pointer]
  - region "Notifications (F8)":
    - list
  - alert [ref=e30]
```