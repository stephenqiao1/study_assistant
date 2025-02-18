import { createClient } from '@supabase/supabase-js'
import { Database } from '../src/types/supabase'

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const DEMO_USER_ID = '11111111-1111-1111-1111-111111111111'

const modules = [
  {
    module_id: 'intro-to-javascript',
    session_type: 'text',
    details: {
      title: 'Introduction to JavaScript',
      content: `# Introduction to JavaScript

## What is JavaScript?

JavaScript is a high-level, interpreted programming language that is one of the core technologies of the World Wide Web. 

### Key Concepts

1. Variables and Data Types
2. Functions and Scope
3. Objects and Arrays

## Example Code

\`\`\`javascript
let greeting = "Hello, World!";
console.log(greeting);

function add(a, b) {
  return a + b;
}
\`\`\`

## Mathematical Concepts

When working with JavaScript math operations, remember:

$f(x) = x^2$ represents a quadratic function

And the quadratic formula is:

$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$`
    }
  },
  {
    module_id: 'react-fundamentals',
    session_type: 'text',
    details: {
      title: 'React Fundamentals',
      content: `# React Fundamentals

## Components and Props

React components are the building blocks of any React application. They are reusable pieces of code that return React elements.

### Example Component

\`\`\`jsx
function Welcome(props) {
  return <h1>Hello, {props.name}</h1>;
}
\`\`\`

## State Management

React components can have state, which determines how a component renders and behaves.

### Hooks Example

\`\`\`jsx
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);
  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  );
}
\`\`\`

## Component Lifecycle

Understanding the component lifecycle is crucial for building React applications:

1. Mounting
2. Updating
3. Unmounting`
    }
  },
  {
    module_id: 'data-structures',
    session_type: 'text',
    details: {
      title: 'Data Structures in Computer Science',
      content: `# Data Structures

## Arrays and Lists

Arrays are fundamental data structures that store elements in contiguous memory locations.

### Time Complexity

For an array of size $n$:
- Access: $O(1)$
- Search: $O(n)$
- Insertion: $O(n)$
- Deletion: $O(n)$

## Binary Trees

A binary tree is a tree data structure where each node has at most two children.

### Tree Properties

The height of a balanced binary tree with $n$ nodes is:

$$h = \\log_2(n)$$

### Example Implementation

\`\`\`python
class Node:
    def __init__(self, value):
        self.value = value
        self.left = None
        self.right = None
\`\`\`

## Graph Theory

Graphs are represented as $G = (V, E)$ where:
- $V$ is the set of vertices
- $E$ is the set of edges`
    }
  }
]

async function seedDatabase() {

  // Insert modules
  for (const module of modules) {
    const { error } = await supabase.from('study_sessions').insert({
      user_id: DEMO_USER_ID,
      module_id: module.module_id,
      session_type: module.session_type,
      started_at: new Date().toISOString(),
      details: module.details
    })

    if (error) {
      console.error(`Error inserting module ${module.module_id}:`, error)
    } else {
    }
  }

  // Verify the inserted data
  const { data: insertedModules, error: verifyError } = await supabase
    .from('study_sessions')
    .select('*')
    .eq('user_id', DEMO_USER_ID)

  if (verifyError) {
    console.error('Error verifying inserted data:', verifyError)
  } else {
    console.log('Inserted modules:', insertedModules)
  }
}

seedDatabase()
  .then(() => console.log('Seeding completed'))
  .catch(console.error) 