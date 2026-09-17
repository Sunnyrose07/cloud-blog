"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { supabase } from "../lib/supabase";

type Post = {
  id: string;
  title: string;
  slug: string;
  markdown: string;
  published: boolean;
  tags: string[];
  created_at: string;
};

type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  created_at: string;
};

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [newComment, setNewComment] = useState<Record<string, string>>({});
  const [user, setUser] = useState<any>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [published, setPublished] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function loadPosts() {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("published", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setPosts(data || []);
    setLoading(false);

    if (data) {
      data.forEach((post) => loadComments(post.id));
    }
  }

  async function loadComments(postId: string) {
    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (!error) {
      setComments((prev) => ({
        ...prev,
        [postId]: data || [],
      }));
    }
  }

  useEffect(() => {
    loadPosts();
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function login() {
    const email = prompt("Enter your email");

    if (!email) return;

    const { error } = await supabase.auth.signInWithOtp({
      email,
    });

    if (error) {
      alert(error.message);
    } else {
      alert("Login link sent to your email");
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
  }

  async function savePost() {
    if (!title || !slug || !markdown) {
      alert("Please fill all fields");
      return;
    }

    setSaving(true);

    if (editingId) {
      const { error } = await supabase
        .from("posts")
        .update({
          title,
          slug,
          markdown,
          published,
        })
        .eq("id", editingId);

      if (error) {
        alert(error.message);
        setSaving(false);
        return;
      }

      alert("Post updated successfully!");
    } else {
      const { error } = await supabase.from("posts").insert({
        title,
        slug,
        markdown,
        published,
        tags: [],
      });

      if (error) {
        alert(error.message);
        setSaving(false);
        return;
      }

      alert("Post created successfully!");
    }

    setTitle("");
    setSlug("");
    setMarkdown("");
    setPublished(false);
    setEditingId(null);
    setSaving(false);

    loadPosts();
  }

  function editPost(post: Post) {
    setEditingId(post.id);
    setTitle(post.title);
    setSlug(post.slug);
    setMarkdown(post.markdown);
    setPublished(post.published);
  }

  function cancelEdit() {
    setEditingId(null);
    setTitle("");
    setSlug("");
    setMarkdown("");
    setPublished(false);
  }

  async function addComment(postId: string) {
    const text = newComment[postId]?.trim();

    if (!text) {
      alert("Please write a comment");
      return;
    }

    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      alert("Please login to add a comment");
      return;
    }

    const { error } = await supabase.from("comments").insert({
      post_id: postId,
      user_id: currentUser.id,
      body: text,
    });

    if (error) {
      alert(error.message);
      return;
    }

    setNewComment((prev) => ({
      ...prev,
      [postId]: "",
    }));

    loadComments(postId);
  }

  return (
    <main
      style={{
        maxWidth: "850px",
        margin: "0 auto",
        padding: "40px 20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1>Cloud Blog</h1>
      <p>My cloud-based blog platform</p>

      <div style={{ marginBottom: "20px" }}>
        {user ? (
          <>
            <span>Logged in: {user.email}</span>
            <button onClick={logout} style={{ marginLeft: "10px" }}>
              Logout
            </button>
          </>
        ) : (
          <button onClick={login}>Login</button>
        )}
      </div>

      <hr />

      <section>
        <h2>{editingId ? "Edit Post" : "Create New Post"}</h2>

        <input
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ width: "100%", padding: "10px" }}
        />

        <br />
        <br />

        <input
          placeholder="Slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          style={{ width: "100%", padding: "10px" }}
        />

        <br />
        <br />

        <textarea
          placeholder="Write your post..."
          value={markdown}
          onChange={(e) => setMarkdown(e.target.value)}
          rows={8}
          style={{ width: "100%", padding: "10px" }}
        />

        <br />
        <br />

        <label>
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
          />{" "}
          Publish
        </label>

        <br />
        <br />

        <button onClick={savePost} disabled={saving}>
          {saving
            ? "Saving..."
            : editingId
            ? "Update Post"
            : "Create Post"}
        </button>

        {editingId && (
          <button onClick={cancelEdit} style={{ marginLeft: "10px" }}>
            Cancel
          </button>
        )}
      </section>

      <hr />

      <h2>Published Posts</h2>

      {loading && <p>Loading posts...</p>}

      {posts.map((post) => (
        <article
          key={post.id}
          style={{
            border: "1px solid #ddd",
            borderRadius: "10px",
            padding: "20px",
            marginTop: "20px",
          }}
        >
          <h2>{post.title}</h2>

          <ReactMarkdown>{post.markdown}</ReactMarkdown>

          <p>
            <strong>Slug:</strong> {post.slug}
          </p>

          <button onClick={() => editPost(post)}>Edit</button>

          <hr />

          <h3>Comments</h3>

          {(comments[post.id] || []).map((comment) => (
            <div
              key={comment.id}
              style={{
                padding: "10px",
                borderBottom: "1px solid #eee",
              }}
            >
              {comment.body}
            </div>
          ))}

          <br />

          <input
            placeholder="Write a comment..."
            value={newComment[post.id] || ""}
            onChange={(e) =>
              setNewComment((prev) => ({
                ...prev,
                [post.id]: e.target.value,
              }))
            }
            style={{ width: "70%", padding: "10px" }}
          />

          <button
            onClick={() => addComment(post.id)}
            style={{ marginLeft: "10px" }}
          >
            Add Comment
          </button>
        </article>
      ))}
    </main>
  );
}