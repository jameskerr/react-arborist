import { ComponentType } from "react";
import * as icons from "react-icons/md";

export type MultiTreeItem = {
  id: string;
  name: string;
  children?: MultiTreeItem[];
};

export const tree1Data: MultiTreeItem[] = [
  {
    id: "t1_1",
    name: "Fruit",
    children: [
      {
        id: "t1_1_1",
        name: "Apple",
      },
      {
        id: "t1_1_2",
        name: "Banana",
      },
      {
        id: "t1_1_3",
        name: "Orange",
      },
    ],
  },
  {
    id: "t1_2",
    name: "Cars",
    children: [
      {
        id: "t1_2_1",
        name: "Audi",
      },
      {
        id: "t1_2_2",
        name: "BMW",
      },
      {
        id: "t1_2_3",
        name: "Mercedes",
      },
    ],
  },
  {
    id: "t1_3",
    name: "Places",
    children: [
      {
        id: "t1_3_1",
        name: "New York",
      },
      {
        id: "t1_3_2",
        name: "London",
      },
      {
        id: "t1_3_3",
        name: "Paris",
      },
    ],
  }
];


export const tree2Data: MultiTreeItem[] = [
  {
    id: "t2_1",
    name: "Fruit",
    children: [
      {
        id: "t2_1_1",
        name: "Pineapple",
      },
      {
        id: "t2_1_2",
        name: "Strawberry",
      },
      {
        id: "t2_1_3",
        name: "Tangerine",
      },
    ],
  },
  {
    id: "t2_2",
    name: "Cars",
    children: [
      {
        id: "t2_2_1",
        name: "Citroen",
      },
      {
        id: "t2_2_2",
        name: "Fiat",
      },
      {
        id: "t2_2_3",
        name: "Renault",
      },
    ],
  },
  {
    id: "t2_3",
    name: "TV Shows",
    children: [
      {
        id: "t2_3_1",
        name: "Severance",
      },
      {
        id: "t2_3_2",
        name: "Gangs Of London",
      },
      {
        id: "t2_3_3",
        name: "Andor",
      },
    ],
  }
];


export const tree3Data: MultiTreeItem[] = [
  {
    id: "t3_1",
    name: "Fruit",
    children: [
      {
        id: "t3_1_1",
        name: "Kiwi",
      },
      {
        id: "t3_1_2",
        name: "Lemon",
      },
      {
        id: "t3_1_3",
        name: "Mango",
      },
    ],
  },
]