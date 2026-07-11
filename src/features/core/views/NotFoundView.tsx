import { Link } from 'react-router';

export default function NotFoundView() {
  return (
    <div className="h-screen flex flex-col items-center justify-center text-center p-6">
      <h1 className="text-6xl font-black text-slate-800 mb-4">404</h1>
      <p className="text-xl text-slate-600 mb-8">
        Oups ! La page que vous cherchez n'existe pas.
      </p>
      <Link
        to="/"
        className="bg-blue-600 text-white font-bold py-3 px-8 rounded-full hover:bg-blue-700 transition"
      >
        Retour à l'accueil
      </Link>
    </div>
  );
}
