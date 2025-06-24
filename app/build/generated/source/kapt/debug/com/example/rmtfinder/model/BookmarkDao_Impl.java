package com.example.rmtfinder.model;

import android.database.Cursor;
import androidx.annotation.NonNull;
import androidx.room.CoroutinesRoom;
import androidx.room.EntityDeletionOrUpdateAdapter;
import androidx.room.EntityInsertionAdapter;
import androidx.room.RoomDatabase;
import androidx.room.RoomSQLiteQuery;
import androidx.room.util.CursorUtil;
import androidx.room.util.DBUtil;
import androidx.sqlite.db.SupportSQLiteStatement;
import java.lang.Boolean;
import java.lang.Class;
import java.lang.Exception;
import java.lang.Integer;
import java.lang.Object;
import java.lang.Override;
import java.lang.String;
import java.lang.SuppressWarnings;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.Callable;
import javax.annotation.processing.Generated;
import kotlin.Unit;
import kotlin.coroutines.Continuation;
import kotlinx.coroutines.flow.Flow;

@Generated("androidx.room.RoomProcessor")
@SuppressWarnings({"unchecked", "deprecation"})
public final class BookmarkDao_Impl implements BookmarkDao {
  private final RoomDatabase __db;

  private final EntityInsertionAdapter<BookmarkedRMT> __insertionAdapterOfBookmarkedRMT;

  private final EntityDeletionOrUpdateAdapter<BookmarkedRMT> __deletionAdapterOfBookmarkedRMT;

  public BookmarkDao_Impl(@NonNull final RoomDatabase __db) {
    this.__db = __db;
    this.__insertionAdapterOfBookmarkedRMT = new EntityInsertionAdapter<BookmarkedRMT>(__db) {
      @Override
      @NonNull
      protected String createQuery() {
        return "INSERT OR REPLACE INTO `bookmarked_rmt` (`profileId`) VALUES (?)";
      }

      @Override
      protected void bind(@NonNull final SupportSQLiteStatement statement,
          @NonNull final BookmarkedRMT entity) {
        if (entity.getProfileId() == null) {
          statement.bindNull(1);
        } else {
          statement.bindString(1, entity.getProfileId());
        }
      }
    };
    this.__deletionAdapterOfBookmarkedRMT = new EntityDeletionOrUpdateAdapter<BookmarkedRMT>(__db) {
      @Override
      @NonNull
      protected String createQuery() {
        return "DELETE FROM `bookmarked_rmt` WHERE `profileId` = ?";
      }

      @Override
      protected void bind(@NonNull final SupportSQLiteStatement statement,
          @NonNull final BookmarkedRMT entity) {
        if (entity.getProfileId() == null) {
          statement.bindNull(1);
        } else {
          statement.bindString(1, entity.getProfileId());
        }
      }
    };
  }

  @Override
  public Object insert(final BookmarkedRMT bookmark, final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        __db.beginTransaction();
        try {
          __insertionAdapterOfBookmarkedRMT.insert(bookmark);
          __db.setTransactionSuccessful();
          return Unit.INSTANCE;
        } finally {
          __db.endTransaction();
        }
      }
    }, $completion);
  }

  @Override
  public Object delete(final BookmarkedRMT bookmark, final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        __db.beginTransaction();
        try {
          __deletionAdapterOfBookmarkedRMT.handle(bookmark);
          __db.setTransactionSuccessful();
          return Unit.INSTANCE;
        } finally {
          __db.endTransaction();
        }
      }
    }, $completion);
  }

  @Override
  public Flow<Boolean> isBookmarked(final String profileId) {
    final String _sql = "SELECT EXISTS(SELECT 1 FROM bookmarked_rmt WHERE profileId = ?)";
    final RoomSQLiteQuery _statement = RoomSQLiteQuery.acquire(_sql, 1);
    int _argIndex = 1;
    if (profileId == null) {
      _statement.bindNull(_argIndex);
    } else {
      _statement.bindString(_argIndex, profileId);
    }
    return CoroutinesRoom.createFlow(__db, false, new String[] {"bookmarked_rmt"}, new Callable<Boolean>() {
      @Override
      @NonNull
      public Boolean call() throws Exception {
        final Cursor _cursor = DBUtil.query(__db, _statement, false, null);
        try {
          final Boolean _result;
          if (_cursor.moveToFirst()) {
            final Integer _tmp;
            if (_cursor.isNull(0)) {
              _tmp = null;
            } else {
              _tmp = _cursor.getInt(0);
            }
            _result = _tmp == null ? null : _tmp != 0;
          } else {
            _result = null;
          }
          return _result;
        } finally {
          _cursor.close();
        }
      }

      @Override
      protected void finalize() {
        _statement.release();
      }
    });
  }

  @Override
  public Flow<List<BookmarkedRMT>> getAllBookmarks() {
    final String _sql = "SELECT * FROM bookmarked_rmt";
    final RoomSQLiteQuery _statement = RoomSQLiteQuery.acquire(_sql, 0);
    return CoroutinesRoom.createFlow(__db, false, new String[] {"bookmarked_rmt"}, new Callable<List<BookmarkedRMT>>() {
      @Override
      @NonNull
      public List<BookmarkedRMT> call() throws Exception {
        final Cursor _cursor = DBUtil.query(__db, _statement, false, null);
        try {
          final int _cursorIndexOfProfileId = CursorUtil.getColumnIndexOrThrow(_cursor, "profileId");
          final List<BookmarkedRMT> _result = new ArrayList<BookmarkedRMT>(_cursor.getCount());
          while (_cursor.moveToNext()) {
            final BookmarkedRMT _item;
            final String _tmpProfileId;
            if (_cursor.isNull(_cursorIndexOfProfileId)) {
              _tmpProfileId = null;
            } else {
              _tmpProfileId = _cursor.getString(_cursorIndexOfProfileId);
            }
            _item = new BookmarkedRMT(_tmpProfileId);
            _result.add(_item);
          }
          return _result;
        } finally {
          _cursor.close();
        }
      }

      @Override
      protected void finalize() {
        _statement.release();
      }
    });
  }

  @NonNull
  public static List<Class<?>> getRequiredConverters() {
    return Collections.emptyList();
  }
}
