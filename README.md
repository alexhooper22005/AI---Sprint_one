# AI---Sprint_one
For this sprint I am using AI to create a code website for me to learn from. In this case I used AI to create me a website that you can search through trails.



-------------------------------------------------------------------------------------------




# Project Title (Update)

Add a description of your project here.

## Instructions for Build and Use

Steps to build and/or run the software:

1. First step here
2.
3.

Instructions for using the software:

1. First step here
2.
3.

## Development Environment

To recreate the development environment, you need the following software and/or libraries with the specified versions:

* First thing here
*
*

## Useful Websites to Learn More

I found these websites useful in developing this software:

* [Website Title](Link)
*
*

## Future Work

The following items I plan to fix, improve, and/or add to this project in the future:

* [ ] First thing here
* [
* [ ]








-------------------------------------------------------------------------------------------





# Trail Finder

Trail Finder is a React, TypeScript, and Vite app for finding outdoor places
around the United States. Enter a U.S. ZIP code to load nearby trails on the
map, then filter the loaded results by activity. Trail data comes from
OpenStreetMap; the app looks for nearby, openly licensed photos on Wikimedia
Commons.

## Start the app

```bash
corepack pnpm install
corepack pnpm dev
```

Until Supabase is connected, the app explains that live trail search is not
configured. The map itself uses OpenStreetMap tiles and keeps the required
attribution visible.

## Connect a hosted Supabase project

You need a Supabase account. Creating a project requires signing in to Supabase;
this repository cannot create a cloud project or access your account for you.

1. Create a project in the [Supabase Dashboard](https://supabase.com/dashboard).
   Pick a name, database password, and region, then wait for provisioning to
   finish.
2. In the project's **Settings → API Keys**, copy the **Project URL** and the
   legacy **anon** key. This Edge Function currently verifies a JWT; do not use
   a secret/service-role key in the browser.
3. From the project folder, sign in the CLI and link the project. Find the
   project reference in its URL or under **Settings → General**:

   ```bash
   corepack pnpm dlx supabase login
   corepack pnpm dlx supabase link --project-ref YOUR_PROJECT_REF
   ```

   The CLI login opens a prompt for a Supabase access token. Enter it only in
   your local terminal; do not put it in source files or chat.
4. Apply the trail tables and permissions, then deploy the search function:

   ```bash
   corepack pnpm dlx supabase db push
   corepack pnpm dlx supabase functions deploy search-trails
   ```

5. Create your local Vite environment file:

   ```bash
   cp .env.example .env.local
   ```

   Put the **Project URL** in `VITE_SUPABASE_URL` and the **anon** key in
   `VITE_SUPABASE_ANON_KEY` in `.env.local`. This file is ignored by Git. Never
   use the `service_role`/secret key in a `VITE_` variable.
6. Restart `corepack pnpm dev`, enter a ZIP code, and select **Search ZIP
   code**. Use the activity filters to narrow the trails without another API
   request.

## How trail search works

- ZIP codes are geocoded on demand through OpenStreetMap Nominatim. Their
  returned bounding boxes are approximate ZIP areas, not official postal
  boundaries; map searches can include nearby features outside an irregular
  ZIP boundary. A database-backed rate limiter spaces uncached geocoding
  requests at least one second apart, and resolved areas are cached for 30
  days.
- Trail searches request named supported trail/place features for the selected
  ZIP area's bounded map rectangle without truncating the result count.
  Results and their bounds are cached in Supabase for 12 hours; returned trail
  records are also added to the `trails` table. The catalog grows as people
  search ZIP codes; it is not preloaded with every U.S. trail. OpenStreetMap
  may not have complete or consistently named trail data in every area.
- Activity filters run on the loaded results, so changing them does not run
  another geocoding or trail-data request.
- Wikimedia Commons photos are associated only when the photo is geotagged
  near a result. The card says “Nearby photo” and links the image page and its
  license/creator attribution. Some trails will not have a suitable photo.
- OpenStreetMap data is © OpenStreetMap contributors and available under the
  [ODbL](https://www.openstreetmap.org/copyright). Follow the
  [tile usage policy](https://operations.osmfoundation.org/policies/tiles/).
  Nominatim use follows its
  [usage policy](https://operations.osmfoundation.org/policies/nominatim/).
  Commons media has its own license, shown on each photo card.

## Project commands

```bash
corepack pnpm test
corepack pnpm lint
corepack pnpm build
```
