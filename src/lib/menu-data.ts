export type MenuCategory = "Massas" | "Ingredientes" | "Molhos" | "Bebidas";

export type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: MenuCategory;
};

export const CATEGORIES: MenuCategory[] = ["Massas", "Ingredientes", "Molhos", "Bebidas"];

export const menu: MenuItem[] = [
  // Massas
  { id: "m1", name: "Penne", description: "Massa curta tubular, ideal para molhos encorpados.", price: 32, category: "Massas" },
  { id: "m2", name: "Espaguete", description: "Massa longa clássica italiana.", price: 32, category: "Massas" },
  { id: "m3", name: "Parafuso", description: "Massa em espiral que segura bem os molhos.", price: 32, category: "Massas" },
  { id: "m4", name: "Nhoque", description: "Massa artesanal de batata, macia e saborosa.", price: 38, category: "Massas" },

  // Ingredientes
  { id: "i1", name: "Frango desfiado", description: "Frango temperado e desfiado na hora.", price: 8, category: "Ingredientes" },
  { id: "i2", name: "Calabresa", description: "Calabresa defumada em fatias.", price: 8, category: "Ingredientes" },
  { id: "i3", name: "Bacon", description: "Bacon crocante em cubos.", price: 9, category: "Ingredientes" },
  { id: "i4", name: "Mussarela", description: "Mussarela derretida cremosa.", price: 7, category: "Ingredientes" },
  { id: "i5", name: "Azeitona", description: "Azeitonas pretas fatiadas.", price: 5, category: "Ingredientes" },

  // Molhos
  { id: "s1", name: "Branco", description: "Molho branco cremoso à base de leite e queijo.", price: 10, category: "Molhos" },
  { id: "s2", name: "Bolonhesa", description: "Tradicional molho de carne moída ao tomate.", price: 12, category: "Molhos" },
  { id: "s3", name: "Pomodoro", description: "Molho de tomate fresco com manjericão.", price: 9, category: "Molhos" },
  { id: "s4", name: "Pesto", description: "Manjericão, pinoli, parmesão e azeite.", price: 12, category: "Molhos" },

  // Bebidas
  { id: "b1", name: "Coca-Cola", description: "Lata 350ml gelada.", price: 7, category: "Bebidas" },
  { id: "b2", name: "Coca-Cola Zero", description: "Lata 350ml gelada, sem açúcar.", price: 7, category: "Bebidas" },
  { id: "b3", name: "Guaraná Antarctica", description: "Lata 350ml gelada.", price: 6, category: "Bebidas" },
  { id: "b4", name: "Suco de Laranja", description: "Suco natural 300ml.", price: 9, category: "Bebidas" },
  { id: "b5", name: "Fanta Uva", description: "Lata 350ml gelada.", price: 6, category: "Bebidas" },
  { id: "b6", name: "Fanta Laranja", description: "Lata 350ml gelada.", price: 6, category: "Bebidas" },
  { id: "b7", name: "Água", description: "Garrafa 500ml, com ou sem gás.", price: 5, category: "Bebidas" },
];
