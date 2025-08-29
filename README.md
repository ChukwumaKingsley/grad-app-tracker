
# Grad App Tracker

A modern, responsive web application for tracking graduate school applications, deadlines, and statuses. Built with React, Tailwind CSS, and Supabase.

---

## Features

- **Dashboard**: Grid and list views for all your applications, with progress bars, countdowns, and status tags.
- **Advanced Filtering**: Multi-select checklist filters for program, country, status, level, and event type. Unified filter overlay panel for a clean, professional experience.
- **Timelines**: Visualize all important dates and deadlines, with countdowns and color cues for past/future events.
- **User Profile**: Manage your account and preferences.
- **Skeleton Loaders**: Smooth loading experience for all views.
- **Responsive Design**: Works great on desktop and mobile.

---

## Tech Stack

- **Frontend**: React, Tailwind CSS, Vite
- **Backend**: Supabase (PostgreSQL, Auth)
- **Icons**: Heroicons, React Icons

---

## Getting Started

### Prerequisites
- Node.js (v16+ recommended)
- npm or yarn

### Installation
1. Clone the repository:
	```sh
	git clone https://github.com/ChukwumaKingsley/grad-app-tracker.git
	cd grad-app-tracker
	```
2. Install dependencies:
	```sh
	npm install
	# or
	yarn install
	```
3. Set up your environment variables:
	- Copy `sample.env.local.txt` to `.env.local` and fill in your Supabase credentials.

4. Start the development server:
	```sh
	npm run dev
	# or
	yarn dev
	```

### Build for Production
```sh
npm run build
# or
yarn build
```

---

## Project Structure

```
├── public/                # Static assets
├── src/
│   ├── components/        # React components (Dashboard, Timelines, etc.)
│   ├── assets/            # Images and SVGs
│   ├── App.jsx            # Main app entry
│   ├── main.jsx           # React root
│   ├── index.css          # Tailwind and global styles
│   └── supabaseClient.js  # Supabase config
├── tailwind.config.js     # Tailwind CSS config
├── postcss.config.js      # PostCSS config
├── vite.config.js         # Vite config
└── package.json           # Project metadata and scripts
```

---

## Customization & Theming
- Tailwind CSS is used for all styling. Edit `tailwind.config.js` to adjust the color palette or extend utility classes.
- You can add or modify application statuses, levels, and filter options in the Supabase backend.

---

## Contributing

1. Fork the repository
2. Create a new branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## License

MIT License. See [LICENSE](LICENSE) for details.

---

## Credits
- [Supabase](https://supabase.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Heroicons](https://heroicons.com/)
- [React](https://react.dev/)

---

## Screenshots

> Add screenshots of the dashboard, filter panel, and timelines here for a better overview.
