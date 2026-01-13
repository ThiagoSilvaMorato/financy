import { CategoryCard } from "./components/CategoryCard";

const categoryMock = [
  {
    id: "1",
    title: "Alimentação",
    description: "Restaurantes, delivery e refeições.",
    icon: "Coffee",
    color: "blue",
    transactionCount: 12,
  },
  {
    id: "2",
    title: "Transporte",
    description: "Combustível, transporte público e manutenção.",
    icon: "Car",
    color: "green",
    transactionCount: 8,
  },
  {
    id: "3",
    title: "Lazer",
    description: "Cinema, viagens e atividades recreativas.",
    icon: "Music",
    color: "purple",
    transactionCount: 5,
  },
  {
    id: "4",
    title: "Saúde",
    description: "Medicamentos, consultas e planos de saúde.",
    icon: "Heart",
    color: "red",
    transactionCount: 3,
  },
  {
    id: " 5",
    title: "Educação",
    description: "Cursos, livros e materiais escolares.",
    icon: "Book",
    color: "yellow",
    transactionCount: 4,
  },
];

export const CategoryList = () => {
  return (
    <div className='grid grid-cols-4 gap-4'>
      {categoryMock.map((category) => (
        <CategoryCard
          key={category.id}
          title={category.title}
          description={category.description}
          icon={category.icon}
          color={category.color}
          transactionCount={category.transactionCount}
        />
      ))}
    </div>
  );
};
