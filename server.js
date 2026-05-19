const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend'))); // Serve static files from the frontend directory

// MongoDB connection
mongoose.connect('mongodb://127.0.0.1:27017/expense_tracker')
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('Error connecting to MongoDB:', err));

// Feedback Schema
const feedbackSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comments: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Feedback = mongoose.model('Feedback', feedbackSchema);

// User Schema (Auth)
const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Goal Schema
const goalSchema = new mongoose.Schema({
  email: { type: String, required: true },
  name: { type: String, required: true },
  targetAmount: { type: Number, required: true },
  currentAmount: { type: Number, default: 0 },
  deadline: { type: Date },
  status: { type: String, enum: ['active', 'completed'], default: 'active' },
  createdAt: { type: Date, default: Date.now }
});

const Goal = mongoose.model('Goal', goalSchema);

// Expense Schema (for sync)
const expenseSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // Map to local JS generated ID
  email: { type: String, required: true },
  amount: { type: Number, required: true },
  description: { type: String },
  category: { type: String },
  date: { type: Date },
  type: { type: String }, // 'expense' etc
  items: [
    {
      name: { type: String },
      quantity: { type: Number },
      price: { type: Number }
    }
  ],
  syncedAt: { type: Date, default: Date.now }
});

const Expense = mongoose.model('Expense', expenseSchema);

// Routes

// Auth API Routes
// POST register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password } = req.body;

    if (!firstName || !lastName || !email || !phone || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ firstName, lastName, email, phone, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: 'User registered successfully.', user: { email: newUser.email, firstName: newUser.firstName, lastName: newUser.lastName, phone: newUser.phone } });
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'No account found with this email.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect credentials.' });
    }

    res.status(200).json({ message: 'Login successful.', user: { email: user.email, firstName: user.firstName, lastName: user.lastName, phone: user.phone } });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST reset-password
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, phone, newPassword } = req.body;

    if (!email || !phone || !newPassword) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'No account found with this email.' });
    }

    // Verify phone (simple identity check for this demo)
    if (user.phone !== phone) {
      return res.status(401).json({ error: 'Verification failed. Phone number does not match our records.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: 'Password reset successful.' });
  } catch (error) {
    console.error('Error during password reset:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST feedback
app.post('/api/feedback', async (req, res) => {
  try {
    const { name, email, rating, comments } = req.body;

    // Detailed Terminal Logging
    console.log('\n=========================');
    console.log('📬 NEW FEEDBACK RECEIVED');
    console.log('-------------------------');
    console.log(`👤 Name:     ${name}`);
    console.log(`📧 Email:    ${email}`);
    console.log(`⭐ Rating:   ${rating}/5`);
    console.log(`💬 Comments: ${comments}`);
    console.log('=========================\n');

    if (!name || !email || !rating || !comments) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const newFeedback = new Feedback({ name, email, rating, comments });
    await newFeedback.save();

    res.status(201).json({ message: 'Feedback submitted successfully.', feedback: newFeedback });
  } catch (error) {
    console.error('Error saving feedback:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET all feedback (for admin)
app.get('/api/feedback', async (req, res) => {
  try {
    const feedbacks = await Feedback.find().sort({ createdAt: -1 });
    res.status(200).json(feedbacks);
  } catch (error) {
    console.error('Error retrieving feedback:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Goals API Routes
// GET goals for user
app.get('/api/goals/:email', async (req, res) => {
  try {
    const email = req.params.email;
    console.log(`[Database] Fetching goals for: ${email}`);
    const goals = await Goal.find({ email: email }).sort({ createdAt: -1 });
    console.log(`[Database] Found ${goals.length} goals.`);
    res.status(200).json(goals);
  } catch (error) {
    console.error('Error retrieving goals:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST new goal
app.post('/api/goals', async (req, res) => {
  try {
    const { email, name, targetAmount, deadline } = req.body;
    if (!email || !name || !targetAmount) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }
    const newGoal = new Goal({ email, name, targetAmount, deadline });
    await newGoal.save();
    res.status(201).json({ message: 'Goal created.', goal: newGoal });
  } catch (error) {
    console.error('Error creating goal:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// PUT update goal (add funds)
app.put('/api/goals/:id', async (req, res) => {
  try {
    const { addAmount } = req.body;
    const goal = await Goal.findById(req.params.id);
    if (!goal) return res.status(404).json({ error: 'Goal not found.' });

    goal.currentAmount += Number(addAmount) || 0;
    if (goal.currentAmount >= goal.targetAmount) {
      goal.currentAmount = goal.targetAmount;
      goal.status = 'completed';
    }
    await goal.save();
    res.status(200).json({ message: 'Goal updated.', goal });
  } catch (error) {
    console.error('Error updating goal:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Expenses API Routes (Sync)
app.post('/api/expenses/sync', async (req, res) => {
  try {
    const { email, expenses } = req.body;
    if (!email || !expenses || !Array.isArray(expenses)) {
      return res.status(400).json({ error: 'Invalid payload format for sync.' });
    }

    let syncedCount = 0;
    for (const exp of expenses) {
      // Upsert expense by local ID to prevent duplicates
      await Expense.findOneAndUpdate(
        { id: exp.id },
        {
          id: exp.id,
          email: email,
          amount: exp.amount,
          description: exp.description,
          category: exp.category,
          date: new Date(exp.date),
          type: exp.type || 'expense',
          items: exp.items || [],
          syncedAt: Date.now()
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      syncedCount++;
    }
    res.status(200).json({ message: 'Sync successful', count: syncedCount });
  } catch (error) {
    console.error('Error during data sync:', error);
    res.status(500).json({ error: 'Internal server error during sync.' });
  }
});

// GET expenses for user
app.get('/api/expenses/:email', async (req, res) => {
  try {
    const email = req.params.email;
    const expenses = await Expense.find({ email: email }).sort({ date: -1 });
    res.status(200).json(expenses);
  } catch (error) {
    console.error('Error retrieving expenses:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
