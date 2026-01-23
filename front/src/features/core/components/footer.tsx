export default function Footer() {
  return (
    <footer className="flex items-start justify-between p-4 bg-white border-t border-gray-200">
      <p className="text-sm text-gray-500">
        © 2023 My App. All rights reserved.
      </p>
      <nav className="flex items-center space-x-4">
        <a href="/privacy" className="text-gray-700 hover:text-black">
          Privacy Policy
        </a>
        <a href="/terms" className="text-gray-700 hover:text-black">
          Terms of Service
        </a>
      </nav>
    </footer>
  );
}
