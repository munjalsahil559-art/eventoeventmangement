import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { categories } from '@/data/events';

const CategorySection = () => (
  <section>
    <h2 className="mb-6 font-display text-2xl font-bold">Browse by Category</h2>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
      {categories.map((cat, i) => (
        <motion.div key={cat.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
          <Link
            to={`/events?category=${cat.id}`}
            className="group flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-glow"
          >
            <span className="text-4xl">{cat.icon}</span>
            <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
              {cat.label}
            </span>
          </Link>
        </motion.div>
      ))}
    </div>
  </section>
);

export default CategorySection;
