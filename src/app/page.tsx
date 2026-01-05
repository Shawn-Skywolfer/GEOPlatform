import { redirect } from 'next/navigation';
import Navbar from '@/components/Navbar';

export default function HomePage() {
  redirect('/questions');
}
